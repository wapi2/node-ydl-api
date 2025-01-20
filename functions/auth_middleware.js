import config from './config.js';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    if (token !== config.API_TOKEN) {
        return res.status(403).json({ error: 'Token inválido' });
    }

    next();
};

export default authenticateToken;