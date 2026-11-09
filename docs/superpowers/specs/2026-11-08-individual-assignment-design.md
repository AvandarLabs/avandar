# Assignment design

Shape brief for the demo slice of P5c.3. Implementation plan:
`docs/superpowers/plans/2026-11-08-individual-assignment.md`.

## Job and audience

A Case Records editor, usually an investigator or a team lead during an
outbreak, opens a record and hands it to one teammate. The teammate opens
Assigned to me and works that queue. A viewer can see who has a record and
cannot change it.

Visitor mode: Operate. The interface matches the record page and the records
list that already ship. Brand stays in the existing header control and list
pane, not in a new visual world.

## Outcome and proof

The primary action is choosing the assignee, or clearing it. Success is that
the choice survives a reload, a sync, and a trip to Assigned to me.

What is true here: a record already has `individuals.assigned_to`, Sync
already refuses to overwrite it, and the record header already holds the
status control. Assignment joins that control. It does not invent a second
place to change the record.

The user-facing word is the record. The column stays `assigned_to`.

## Selected direction

One assignee. A workspace member, or unassigned. The control sits in the
record header, immediately after the status control, because changing it is
an action on the record. The properties rail stays reference material.

Assigned to me is its own sidebar destination, listed above the case types
for anyone who can view records. It lists every record assigned to the
signed-in user, grouped by case type. Opening a row goes to that record's
existing page, and the sidebar then highlights that case type.

The case type's record list gains an assignee filter beside the status
filter: Anyone, Unassigned, or one member. Each row names the assignee under
the record name so the filter's result is visible without opening the record.

## Scope and boundaries

This slice ships the writer, the header control, the queue, and the filter.

Explicit anti-goals:

- No in-app notification and no email. Both stay P5c.8.
- No activity-log entry for the change. That stays P5c.5 and P5c.9.
- No user groups. The column is one user id.
- No new permission. Case Records editor is the existing gate, the same one
  status uses.
- No change to Sync. The upsert contract that leaves `assigned_to` alone
  stays as it is.
- A member who leaves the workspace stays on the record until someone
  unassigns it. The control then reads "Former member".

## States and ranges

A workspace in this demo has a handful of members and a few case types.
A case type can have more records than one screen, so the case type list
keeps its paging. The queue pages the same way and asks for the next page.

Material states: loading members, saving, save failed, unassigned, assigned,
former member, empty queue, empty filtered list, no permission to edit.

## Interaction and layout

Header. Status, then assignee. An editor gets a menu: Unassigned, then
members by display name, with a check on the current one. A viewer gets the
same words without a menu. The choice saves immediately. A second choice
waits until the first settles. Failure restores the previous assignee and
toasts, without the database's own message.

Queue. Slate toolbar and header both say "Assigned to me". The header fact
is the count ("12 records"). One section per case type that has a loaded
row, titled with the case type's name and a count. Rows match the records
list: name, status dot, and a link to the record. No properties rail. An
empty queue says "Nothing is assigned to you."

Case type list. The assignee filter sits under the status filter. It is
always shown, as the status filter is. Clearing it means anyone. The header
count uses the same filter as the rows.

## Constraints and open decisions

Web, inside the current slate. Copy goes through Lingui. The menu is
keyboard reachable, the same way the status menu is. Layouts stay mirrorable.
Color is never the only signal: the status dot keeps its name, and the
assignee is text.

The database already points `assigned_to` at `auth.users`. This slice adds
the rule the column does not have: a Case Records editor may set it, and
only to a member of the record's workspace, or to empty. A Case Types editor
can still sync records and must not be able to assign them. That check is a
trigger, because row-level security cannot single out one column. The status
trigger is the pattern.

No decision is left for a builder to invent. User groups, notifications,
email, and the activity log are named above and stay on the roadmap.
