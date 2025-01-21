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

const ytdlOptions = {
    requestOptions: {
        headers: {
            // Configuración de cookies y headers para evitar restricciones
            cookie: process.env.COOKIE || 'CONSENT=YES+; Path=/; Domain=.youtube.com;',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'x-forwarded-for': '66.249.66.1'
        }
    }
};

router.use(['/info', '/mp3', '/mp4'], authenticateToken);

router.get("/", (req, res) => {
    res.sendStatus(200);
});

// Endpoint para ver versiones de paquetes
router.get("/packages", authenticateToken, async (req, res) => {
    try {
        // Leer las versiones directamente de los node_modules
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
                CONTEXT: process.env.CONTEXT,
                DEPLOY_URL: process.env.DEPLOY_URL,
                DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
                URL: process.env.URL
            }
        };

        res.json(dependencies);
    } catch (error) {
        console.error('Error getting package versions:', error);
        res.status(500).json({ 
            error: "Error reading package versions",
            details: error.message,
            stack: error.stack
        });
    }
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
                res.status(500).json({ error: 'Error during streaming' });
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
                res.status(500).json({ error: 'Error during streaming' });
            }
        });

        stream.pipe(res);
    } catch (error) {
        console.error('Error in /mp4:', error);
        res.status(500).json({ error: error.message || "Error downloading video" });
    }
});

app.use('/.netlify/functions/server', router);
app.use('/api', router);

export const handler = serverless(app);