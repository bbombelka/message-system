const express = require('express');
const router = express.Router();
const rengetthrs = require('../services/rengetthrs/rengetthrs-service');
const deleteitem = require('../services/deleteitem/deleteitem-service');
const createmessage = require('../services/createmessage/createmessage-service');
const rengetthrsmsgs = require('../services/rengetthrsmsgs/rengetthrsmsgs-service');
const sendinemail = require('../services/sendinemail/sendinemail-service');

router.post('/rengetthrs', rengetthrs.rengetthrsService);
router.post('/rengetthrsmsgs', rengetthrsmsgs.service);
router.post('/deleteitem', deleteitem.deleteItemService);
router.post('/createmessage', createmessage.service);
router.post('/sendinemail', sendinemail.service);

module.exports = router;
