# Private dashboards and datasets are now private from admins

**Nothing was deleted.** If a private dashboard or dataset disappears from
your admin view after this deploy, it still exists and still belongs to its
owner. Read on for why, and where to look instead.

**What changed.** A dashboard or dataset that is restricted with no shares is
now readable by its owner alone. Workspace owners and Settings Admins are
included in that exclusion. This matches Google Drive, where an organisation
admin cannot read an employee's private document. Public dashboards are
exempt: a public dashboard stays world-readable and admins keep edit rights on
it.

**What you will notice.** If you are a workspace admin, resources that other
members had kept private no longer appear in your lists and are not reachable
by URL. They still exist, still belong to their owner, and are unaffected in
every other way.

**Where to look instead.** Workspace settings → Privacy log → Private
resources shows how many private dashboards and datasets each member holds.
You can reassign ownership from there without gaining access to the content.

**Removing a member.** A member who still owns resources cannot be removed
until someone else owns them. The Members tab now says so and links to the
reassignment screen.

**Number of resources affected in your workspace:** <fill in from the
pre-deploy query in docs/superpowers/specs/2026-08-13-private-resource-permissions-hardening-design.md
§6.2>
