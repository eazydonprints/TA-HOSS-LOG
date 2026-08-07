const validateCreateUser = (req, res, next) => {
    const { fullname, username, password, role } = req.body;

    if (!fullname || !username || !password || !role) {
        return res.status(400).json({
            success: false,
            message: "All fields are required."
        });
    }

    const roles = [
        "super_admin",
        "registration_officer",
        "verification_officer",
        "viewer"
    ];

    if (!roles.includes(role)) {
        return res.status(400).json({
            success: false,
            message: "Invalid role."
        });
    }

    next();
};

module.exports = validateCreateUser;