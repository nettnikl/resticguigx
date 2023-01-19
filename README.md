# Restic Backup GUI #

Restic + Vue3 + Electron

![Screenshot](https://gitlab.com/stormking/resticguigx/-/raw/master/screenshot.png "Restic-UI-GX")


## Features ##

- setup profiles with multiple backup locations
- forget settings
- store repo password
- shows repo size
- exclude settings
- restore to temp path or original path
- mount to restore files manually

## Roadmap ##

- expose the concept of snapshots

## dev ##

### setup

- pnpm install
- download latest restic release 
- place in ./bin/linux/restic
- make executable
- pnpm run dev


### todo

- icon
- fix unmount problem

- ?? fix can mount without specifying location
- should display currently running command


