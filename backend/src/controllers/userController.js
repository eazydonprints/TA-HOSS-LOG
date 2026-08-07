const bcrypt = require("bcryptjs");
const User = require("../models/User");

const createUser = async (req, res) => {
    try {
        const { fullname, username, password, role } = req.body;

        const exists = await User.findOne({ username });

        if (exists) {
            return res.status(400).json({
                success: false,
                message: "Username already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            fullname,
            username,
            password: hashedPassword,
            role
        });

        res.status(201).json({
            success: true,
            message: "User created successfully.",
            user: {
                id: user._id,
                fullname: user.fullname,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getUsers = async (req, res) => {
    try {

        const users = await User.find().select("-password");

        res.json({
            success: true,
            count: users.length,
            users
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

const getProfile = async (req, res) => {

    res.json({
        success: true,
        user: req.user
    });

};

module.exports = {
    createUser,
    getUsers,
    getProfile
};