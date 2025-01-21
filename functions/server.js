import express from "express";
import serverless from "serverless-http";
import ytdl from "ytdl-core";
import cors from "cors";
import { authenticateToken } from './auth_middleware.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const router = express.Router();

// Configuración de cookies para YouTube
const cookies = [
  {
    "domain": ".youtube.com",
    "expirationDate": 1736793326.182546,
    "hostOnly": false,
    "httpOnly": true,
    "name": "LOGIN_INFO",
    "path": "/",
    "sameSite": "no_restriction",
    "secure": true,
    "session": false,
    "value": "AGGVVk7keKQ:QUQ3MjNmejJrUzFZNktfd1JkdGdJb0YxM1pweUZNMjM5TmFPd2puR0s5QUxjZzFxbDRBd19EY0dLS3RlbFZ5aDBKT3QtQTJIaEJ4RkxZd2ZiTDBIZmJVeVVmNC1vNTR4X0tiZk9McG5CZ25sOVY5MHhOYkpKS09ELWp4dmlyS29IejVyakhVQnBLZEdxSUhHREYySmRJNUx6azN5ZHhn"
  },
  {
    "domain": ".youtube.com",
    "expirationDate": 1736793326.182637,
    "hostOnly": false,
    "httpOnly": true,
    "name": "VISITOR_INFO1_LIVE",
    "path": "/",
    "sameSite": "no_restriction",
    "secure": true,
    "session": false,
    "value": "4VwPMkB7W5A"
  },
  {
    "domain": ".youtube.com",
    "hostOnly": false,
    "httpOnly": true,
    "name": "YSC",
    "path": "/",
    "sameSite": "no_restriction",
    "secure": true,
    "session": true,
    "value": "ZZZ999XXX111"
  },
  {
    "domain": ".youtube.com",
    "expirationDate": 1736793326.182601,
    "hostOnly": false,
    "httpOnly": false,
    "name": "PREF",
    "path": "/",
    "sameSite": "unspecified",
    "secure": true,
    "session": false,
    "value": "tz=America.Lima"
  }
];

// Crear el agente de ytdl con las cookies
const agent = ytdl.createAgent(cookies);

// Opciones comunes para ytdl
const ytdlOptions = {
    agent,
    requestOptions: {
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    }
};

// Rutas existentes
router.use(['/info', '/mp3', '/mp4'], authenticateToken);

router.get("/", (req, res) => {
    res.sendStatus(200);
});

router.get("/info", async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: "Invalid query - URL is required" });
        }

        const isValid = ytdl.validateURL(url);

        if (!isValid) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        const info = await ytdl.getInfo(url, ytdlOptions);

        res.json({ 
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url,
            duration: info.videoDetails.lengthSeconds,
            author: info.videoDetails.author.name,
            formats: info.formats.map(format => ({
                quality: format.quality,
                mimeType: format.mimeType,
                contentLength: format.contentLength
            }))
        });
    } catch (error) {
        console.error('Error in /info:', error);
        res.status(500).json({ error: error.message || "Error getting video info" });
    }
});

router.get("/mp3", async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: "Invalid query - URL is required" });
        }

        const isValid = ytdl.validateURL(url);

        if (!isValid) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        const info = await ytdl.getInfo(url, ytdlOptions);
        const format = ytdl.chooseFormat(info.formats, {
            quality: 'highestaudio',
            filter: 'audioonly'
        });

        if (!format) {
            throw new Error('No suitable audio format found');
        }

        const videoName = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        
        res.header('Content-Disposition', `attachment; filename="${videoName}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        const stream = ytdl(url, {
            ...ytdlOptions,
            format: format
        });

        stream.on('error', (err) => {
            console.error('Stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error during streaming', details: err.message });
            }
        });

        stream.pipe(res);
    } catch (error) {
        console.error('Error in /mp3:', error);
        res.status(500).json({ error: error.message || "Error downloading audio" });
    }
});

router.get("/mp4", async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: "Invalid query - URL is required" });
        }

        const isValid = ytdl.validateURL(url);

        if (!isValid) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        const info = await ytdl.getInfo(url, ytdlOptions);
        const format = ytdl.chooseFormat(info.formats, {
            quality: 'highest',
            filter: format => format.container === 'mp4'
        });

        if (!format) {
            throw new Error('No suitable video format found');
        }

        const videoName = info.videoDetails.title.replace(/[^\w\s]/gi, '');

        res.header('Content-Disposition', `attachment; filename="${videoName}.mp4"`);
        res.header('Content-Type', 'video/mp4');

        const stream = ytdl(url, {
            ...ytdlOptions,
            format: format
        });

        stream.on('error', (err) => {
            console.error('Stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error during streaming', details: err.message });
            }
        });

        stream.pipe(res);
    } catch (error) {
        console.error('Error in /mp4:', error);
        res.status(500).json({ error: error.message || "Error downloading video" });
    }
});

// Keep the packages endpoint
router.get("/packages", authenticateToken, async (req, res) => {
    try {
        const dependencies = {
            node: process.version,
            npm: process.env.npm_version || 'not available',
            dependencies: {
                express: require('express/package.json').version,
                'ytdl-core': require('ytdl-core/package.json').version,
                cors: require('cors/package.json').version,
                'serverless-http': require('serverless-http/package.json').version,
            },
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                NETLIFY: process.env.NETLIFY,
                CONTEXT: process.env.CONTEXT
            }
        };

        res.json(dependencies);
    } catch (error) {
        console.error('Error getting package versions:', error);
        res.status(500).json({ 
            error: "Error reading package versions",
            details: error.message
        });
    }
});

app.use('/.netlify/functions/server', router);
app.use('/api', router);

export const handler = serverless(app);