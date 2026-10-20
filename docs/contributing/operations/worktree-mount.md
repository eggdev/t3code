# Worktree mount

Set up the shared worktree folder once. The files live on the Spark's NVMe at
`/opt/clyde/worktrees`, and the Mac mini mounts the same folder at the same
path over NFS ([0010](../decisions/0010-agents-driven-from-the-server.md)).

## Ownership

| Concern                   | Owner                                     |
| ------------------------- | ----------------------------------------- |
| The worktree files        | The Spark's disk                          |
| The export                | The Spark's NFS server                    |
| The mount on the Mac mini | macOS `automount`, from `/etc/auto_clyde` |
| File ownership            | uid 1000, the sandbox user                |

## Invariants

- Never export the folder to any address but the Mac mini's tailnet address
  (`100.64.132.97`). Any other client could read every project's code.
- Never mount it at another path on the Mac mini. The server and the sandboxes
  must see the same path ([0010](../decisions/0010-agents-driven-from-the-server.md)).
- Never put the event store or any SQLite file in this folder. SQLite over NFS
  can corrupt.

## Steps

On the Spark (`ssh agent-dgx`):

1. Install the NFS server.

   ```sh
   sudo apt-get install -y nfs-kernel-server
   ```

   Result: `systemctl is-active nfs-server` prints `active`.

2. Make the folder, owned by the sandbox user.

   ```sh
   sudo mkdir -p /opt/clyde/worktrees && sudo chown 1000:1000 /opt/clyde/worktrees
   ```

3. Export it to the Mac mini only. `all_squash` with uid 1000 makes every
   write from the Mac mini belong to the sandbox user.

   ```sh
   echo '/opt/clyde/worktrees 100.64.132.97(rw,sync,no_subtree_check,insecure,all_squash,anonuid=1000,anongid=1000)' \
     | sudo tee /etc/exports.d/clyde.exports
   sudo exportfs -ra && sudo exportfs -v
   ```

   Result: `exportfs -v` lists `/opt/clyde/worktrees` for `100.64.132.97`.

On the Mac mini:

4. Make the mount point.

   ```sh
   sudo mkdir -p /opt/clyde/worktrees
   ```

5. Add a direct automount map, so the mount comes back after each restart.

   ```sh
   echo '/- auto_clyde -nobrowse,nosuid' | sudo tee -a /etc/auto_master
   echo '/opt/clyde/worktrees -fstype=nfs,vers=3,resvport,rw,hard,nolocks 100.88.14.22:/opt/clyde/worktrees' \
     | sudo tee /etc/auto_clyde
   sudo automount -cv
   ```

   Result: `automount` lists `/opt/clyde/worktrees`.

6. Check that both machines see the same file, owned by uid 1000.

   ```sh
   date > /opt/clyde/worktrees/.mount-check
   ssh agent-dgx 'cat /opt/clyde/worktrees/.mount-check; stat -c %u /opt/clyde/worktrees/.mount-check'
   rm /opt/clyde/worktrees/.mount-check
   ```

   Result: the Spark prints the same date and `1000`.

## Later deploys

The deploy workflow does not touch the mount. A change to the path is a
one-way door: every live thread's worktree path changes with it.
