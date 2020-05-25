const express = require('express');
const router = express.Router();
const deleteitem = require('../services/deleteitem/deleteitem-service');
const sendinemail = require('../services/sendinemail/sendinemail-service');
const uploadattachment = require('../services/uploadattachment/uploadattachment-service');
const getthreads = require('../services/getthreads/getthreads-service');
const getmessages = require('../services/getmessages/getmessages-service');
const sendmessage = require('../services/sendmessage/sendmessage-service');
const getattachment = require('../services/getattachment/getattachment-service');
const deleteattachment = require('../services/deleteattachment/deleteattachment-service');

router.post('/getthreads', getthreads.service);
router.post('/getmessages', getmessages.service);
router.post('/deleteitem', deleteitem.service);
router.post('/sendinemail', sendinemail.service);
router.post('/uploadattachment', uploadattachment.service);
router.post('/sendmessage', sendmessage.service);
router.post('/getattachment', getattachment.service);
router.post('/deleteattachment', deleteattachment.service);

module.exports = router;
