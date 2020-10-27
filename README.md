# csync

csync is a command line program for syncing files with cloud storage, just like rsync.

csync can sync files between multiple cloud storage provider.
(Supported storage provider is currenly only [box](https://www.box.com).)

## `.env`

```
BOX_KEY_PATH="./1234567_abcdefg_config.json"
BOX_USER_ID="0123456789"
```

## usage

### Upload local file to remote

```
$ ts-node src ./path-to-directory-to-sync box:folder-name-on-box
```

### Download files from remote

```
$ ts-node src box:folder-name-on-box ./path-to-directory-to-sync
```

### Copy files cloud-to-cloud

```
$ ts-node src box:folder-A box:folder-B
```
