import express from "express";
import serverless from "serverless-http";
import { play } from "play-dl";
import cors from "cors";
import { authenticateToken } from './auth_middleware.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const router = express.Router();

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

        const videoInfo = await play.video_info(url);
        
        res.json({ 
            title: videoInfo.video_details.title,
            thumbnail: videoInfo.video_details.thumbnails[0].url,
            duration: videoInfo.video_details.durationInSec,
            author: videoInfo.video_details.channel.name,
            description: videoInfo.video_details.description,
            views: videoInfo.video_details.views,
            uploadedAt: videoInfo.video_details.uploadedAt
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

        const videoInfo = await play.video_info(url);
        const stream = await play.stream(url, { discordPlayerCompatibility: true });
        
        const videoName = videoInfo.video_details.title.replace(/[^\w\s]/gi, '');
        
        res.header('Content-Disposition', `attachment; filename="${videoName}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        stream.stream.pipe(res);

        stream.stream.on('error', (err) => {
            console.error('Stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error during streaming', details: err.message });
            }
        });
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

        const videoInfo = await play.video_info(url);
        const stream = await play.stream(url, { quality: 1080 }); // Highest quality

        const videoName = videoInfo.video_details.title.replace(/[^\w\s]/gi, '');

        res.header('Content-Disposition', `attachment; filename="${videoName}.mp4"`);
        res.header('Content-Type', 'video/mp4');

        stream.stream.pipe(res);

        stream.stream.on('error', (err) => {
            console.error('Stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error during streaming', details: err.message });
            }
        });
    } catch (error) {
        console.error('Error in /mp4:', error);
        res.status(500).json({ error: error.message || "Error downloading video" });
    }
});

// Mantener el endpoint de packages
router.get("/packages", authenticateToken, async (req, res) => {
    try {
        const dependencies = {
            node: process.version,
            npm: process.env.npm_version || 'not available',
            dependencies: {
                express: require('express/package.json').version,
                'play-dl': require('play-dl/package.json').version,
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