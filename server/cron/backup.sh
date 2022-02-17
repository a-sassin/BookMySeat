set -x

# Local backup storage directory
local_backupfolder=mongo/backups

# Notification email address
recipient_email=ullasa.sindhur@gslab.com
# Number of days to store the backup
keep_day=30

# remote backup storage
remoute_backupfolder=root@10.43.13.29:/mongo/backups

gzfile=$local_backupfolder/BMS-$(date +%d-%m-%Y_%H-%M-%S).gz

#create backup folder
mkdir -p $local_backupfolder

# Create a backup
if mongodump --uri="mongodb://bmsApp:Bmsapp_15-08#2021@10.43.12.229:27017,10.43.12.58:27017,10.43.13.63:27017/BookMySeats?authSource=BookMySeats&replicaSet=bmsdb&readPreference=primaryPreferred" --gzip --archive=$gzfile ; then
   echo 'Backup created'
else
   echo 'mongodump return non-zero code' | mailx -s 'No backup was created!' $recipient_email
   exit
fi

# Delete old backups
find $local_backupfolder -mtime +$keep_day -delete

# Local and remote storage sync

if rsync -avh --delete $local_backupfolder $remoute_backupfolder ; then
   echo 'Backup sended'
else
   echo 'rsync return non-zero code' | mailx -s 'No backup was sended!' $recipient_email
   exit
fi

echo $gzfile | mailx -s 'Backup was successfully created' $recipient_email