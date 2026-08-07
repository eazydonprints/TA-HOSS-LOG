const AuditLog = require("../models/AuditLog");

const logAudit = async (req, action, moduleName) => {

    try {

        await AuditLog.create({

            user: req.user?._id,

            action,

            module: moduleName,

            ipAddress: req.ip

        });

    } catch (err) {

        console.error(err);

    }

};

module.exports = logAudit;