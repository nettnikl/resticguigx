# Restic Backup GUI #

Restic + Vue3 + Electron

## Features ##

- setup profiles with multiple backup locations
- forget settings
- store repo password
- shows repo size

## Roadmap ##

- expose the concept of snapshots

## dev ##

### setup

download latest restic release and place in ./bin/linux/restic
for packaging, download mac and win versions to ./bin/mac/restic and ./bin/win/restic.exe

### todo

- forget should remove path from repo
- allow to cancel backup process
- restore
- mount
- on first add existing repo, parse snapshots to add folders
- on select profile (or first time in the day, update profile from repo)

- fix unmount problem

- encrypted profile
- ask for password strat
- 
