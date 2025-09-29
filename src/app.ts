import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import passport from 'passport';
import path from 'path'
import authRoutes from './routes/auth';
import blogRoutes from './routes/blogs';
import userRoutes from './routes/users';
import uploadRoutes from './routes/upload';

import './config/passport';



const app = express();



// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       defaultSrc: ["'self'"],
//       imgSrc: [
//         "'self'",
//         "data:",
//         "https://lh3.googleusercontent.com",
//         "https://*.googleusercontent.com",
//         "https://res.cloudinary.com"   // ✅ allow Cloudinary images
//       ],
//       styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
//       fontSrc: ["'self'", "https://fonts.gstatic.com"],
//     },
//   })
// );

app.use(compression());

const PublicPath = path.join(__dirname, '..', 'public')


app.use(express.static(PublicPath))

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));



// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(PublicPath, 'index.html'));
});

app.use('/auth', authRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Blog App API is running' });
});

// 404 handler
app.use('*', (req, res) => {
    console.log('being redirected')
    res.status(200).sendFile(path.join(PublicPath, 'index.html'));
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        error: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message + 'hello'
    });
});


export default app;
// console.log("etlunnau bhai")