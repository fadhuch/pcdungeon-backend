const User = require('../models/user');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

exports.register = catchAsync(async (req, res) => {
    const { username, email, password, role } = req.body;

    const user = await User.create({
        username,
        email,
        password,
        role: role || 'user'
    });

    const token = generateToken(user._id);

    res.status(201).json({
        status: 'success',
        token,
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        }
    });
});

exports.login = catchAsync(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            status: 'error',
            message: 'Please provide email and password'
        });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({
            status: 'error',
            message: 'Incorrect email or password'
        });
    }

    const token = generateToken(user._id);

    res.status(200).json({
        status: 'success',
        token,
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        }
    });
});

exports.adminLogin = catchAsync(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            status: 'error',
            message: 'Please provide email and password'
        });
    }

    const user = await User.findOne({ email, role: 'admin' }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid admin credentials'
        });
    }

    const token = generateToken(user._id);

    res.status(200).json({
        status: 'success',
        token,
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        }
    });
});

exports.getProfile = catchAsync(async (req, res) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        status: 'success',
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        }
    });
});

exports.forgotPassword = catchAsync(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            status: 'error',
            message: 'Please provide email address'
        });
    }

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({
            status: 'error',
            message: 'No user found with that email address'
        });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token and save to user
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    try {
        // Create reset URL
        const resetURL = `${req.protocol}://${req.get('host')}/admin/reset-password/${resetToken}`;

        // Configure email transporter (you may need to adjust these settings)
        const transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@pcdungeon.com',
            to: user.email,
            subject: 'Password Reset Request - PC Dungeon Admin',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #dc2626;">Password Reset Request</h2>
                    <p>Hello ${user.username || 'Admin'},</p>
                    <p>You have requested a password reset for your PC Dungeon admin account.</p>
                    <p>Click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetURL}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
                    </div>
                    <p>Or copy and paste this link in your browser:</p>
                    <p style="word-break: break-all; color: #6b7280;">${resetURL}</p>
                    <p><strong>This link will expire in 10 minutes.</strong></p>
                    <p>If you didn't request this password reset, please ignore this email.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 14px;">PC Dungeon Admin Panel</p>
                </div>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.status(200).json({
            status: 'success',
            message: 'Password reset link sent to your email address'
        });

    } catch (error) {
        // Clear reset token if email sending fails
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        console.error('Email sending error:', error);
        
        return res.status(500).json({
            status: 'error',
            message: 'There was an error sending the email. Please try again later.'
        });
    }
});

exports.resetPassword = catchAsync(async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
        return res.status(400).json({
            status: 'error',
            message: 'Please provide password and confirm password'
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({
            status: 'error',
            message: 'Passwords do not match'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            status: 'error',
            message: 'Password must be at least 6 characters long'
        });
    }

    // Hash the token to compare with stored token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
        return res.status(400).json({
            status: 'error',
            message: 'Token is invalid or has expired'
        });
    }

    // Update password and clear reset token
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Generate new JWT token
    const jwtToken = generateToken(user._id);

    res.status(200).json({
        status: 'success',
        token: jwtToken,
        message: 'Password has been reset successfully',
        data: {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        }
    });
});
