# Cleanup

1. List local branches with
   `git for-each-ref --format='%(refname:short)' refs/heads` and slugify them
   with the runner's rules.
2. Inspect review artifacts and `.session-*.json` under `.difit/` only.
3. Keep files matching existing branch slugs. Rename an unambiguous stale stem
   to the current branch stem, moving all six artifacts together.
4. Delete remaining stale artifacts, sessions for deleted branches, and retired
   `.watcher-*.log` files. Never delete a session for an existing branch.
5. Delete an empty (`[]`) transcript that has no guide artifacts and no live
   session: it is the stub `dif` creates at launch, left by a run that never
   produced a review. Keep an empty transcript whose guides exist: that is a
   real zero-thread review.
6. Report every rename and deletion.

Never touch files outside `.difit/` in Cleanup mode.
