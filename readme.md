# MESSAGE SYSTEM

Application designed to provide messaging channel with clients of various buisnesses.

Allows the user to communicate with the company both ways, notifying customer of
promotions, current events, enabling client to initiate complaint process, sending
documents etc. BE stack built with Node, Express, Mongodb, Redis FE stack built with React,
Material-UI, deployed to AWS ec2 instance with database running on MongoCloud.

Visit **www.message-system.site**

### TODO:

- ~~Enable attachment of files during message edition - requires watching the mode and differentiate local attachments vs fetched~~
- ~~Connect attachment link to snackbar via general context~~
- ~~disable turning on mark mode on edition or upload mode~~
- ~~fix BE number of message while deletion~~
- ~~fix BE order of fetched threads and messages (from newest to oldest)~~
- ~~fix FE deletion of last message in thread~~
- ~~make sure cache refreshes on read messages~~
- ~~check cache on deleting messages x~~
- ~~check reply possibility on different messages types~~
- ~~consider a loader for file removal~~
- ~~deleting an attachment in text editor doesnt reflect on list of attachments in opened message. Also the list of attachments in message is also in edit mode and the files can be removed from it directly~~
- ~~modfiy checkbox size on mobile~~
- ~~fix enabled click on thread bar during mark mode~~
- ~~fix cache on file operations~~
