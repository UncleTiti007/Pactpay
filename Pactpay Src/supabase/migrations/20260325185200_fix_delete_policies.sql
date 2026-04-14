-- Allow clients to delete their own pending/draft contracts
drop policy if exists "Client can delete own contract" on public.contracts;
create policy "Client can delete own contract"
  on public.contracts for delete
  using (auth.uid() = client_id and status in ('pending', 'draft'));

-- Allow clients to delete milestones on their own contracts
drop policy if exists "Client can delete milestones" on public.milestones;
create policy "Client can delete milestones"
  on public.milestones for delete
  using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_id
      and c.client_id = auth.uid()
    )
  );

-- Allow users to delete deliverables on their own contracts
drop policy if exists "Client can delete deliverables" on public.deliverables;
create policy "Client can delete deliverables"
  on public.deliverables for delete
  using (
    exists (
      select 1 from public.milestones m
      join public.contracts c on c.id = m.contract_id
      where m.id = milestone_id
      and c.client_id = auth.uid()
    )
  );

-- Allow users to delete their own notifications
drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- Allow contract parties to delete transactions on their contracts
drop policy if exists "Contract parties delete transactions" on public.transactions;
create policy "Contract parties delete transactions"
  on public.transactions for delete
  using (
    exists (
      select 1 from public.contracts c
      where c.id = contract_id
      and (c.client_id = auth.uid() or c.freelancer_id = auth.uid())
    )
  );
