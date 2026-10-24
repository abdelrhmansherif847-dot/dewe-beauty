-- Move is_admin() out of the API-exposed public schema so it cannot be called
-- as /rest/v1/rpc/is_admin. Policies reference the function by OID, so they
-- keep working after the move. Callers still need USAGE and EXECUTE because
-- policies evaluate it with the caller's privileges.
--
-- place_cod_order() and admin_set_order_status() stay in public on purpose:
-- they are the RPC entry points, and both check auth.uid() / staff membership
-- themselves before doing anything.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

alter function public.is_admin() set schema private;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated, service_role;

-- admin_set_order_status() called public.is_admin() by name inside its body.
create or replace function public.admin_set_order_status(
  p_order_id uuid,
  p_status public.order_status
)
returns public.order_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.order_status;
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select o.status into v_current from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0001';
  end if;

  if v_current = p_status then
    return v_current;
  end if;

  if v_current in ('cancelled', 'delivered') then
    raise exception 'order_closed' using errcode = 'P0001';
  end if;

  if p_status = 'cancelled' then
    update public.product_variants v
    set stock = v.stock + i.quantity
    from public.order_items i
    where i.order_id = p_order_id and i.variant_id = v.id;
  end if;

  update public.orders set status = p_status where id = p_order_id;
  return p_status;
end;
$$;
