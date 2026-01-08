/**
 * SANCTUM TOKEN AUTHENTICATION MODULE
 * 
 * PURPOSE: Validate Laravel Sanctum Bearer tokens for WebSocket connections.
 * 
 * SYSTEM CONTRACT (NON-NEGOTIABLE):
 * - Token is extracted from query param: ?token=<BEARER_TOKEN>
 * - Token is hashed using SHA-256 (Laravel Sanctum's algorithm)
 * - Token is validated against personal_access_tokens table
 * - User role and is_active are checked
 * - Only 'student' and 'business' roles allowed
 * 
 * WHY SHA-256:
 * - Laravel Sanctum stores tokens as SHA-256 hashes
 * - We must hash the plaintext token before DB lookup
 * - This matches Laravel's PersonalAccessToken::findToken() behavior
 * 
 * SECURITY NOTES:
 * - Token validation happens ONCE on connection
 * - User identity is attached to socket, not re-validated per message
 * - Expired tokens are rejected
 * - Inactive users are rejected
 */

const crypto = require('crypto');

/**
 * Hash a token using SHA-256 (Laravel Sanctum compatible).
 * 
 * WHY THIS FUNCTION:
 * - Sanctum stores token hash, not plaintext
 * - We need to hash client token to compare
 * 
 * @param {string} token - Plaintext Bearer token
 * @returns {string} - SHA-256 hash of the token
 */
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Validate a Sanctum token and return user info.
 * 
 * VALIDATION STEPS:
 * 1. Hash the token
 * 2. Look up in personal_access_tokens
 * 3. Check expiration
 * 4. Fetch associated user
 * 5. Verify user is active
 * 6. Verify user has allowed role
 * 
 * @param {object} db - MySQL connection pool
 * @param {string} token - Plaintext Bearer token
 * @returns {Promise<{userId: number, role: string}|null>} - User info or null if invalid
 */
async function validateToken(db, token) {
    if (!token || typeof token !== 'string') {
        console.log('[AUTH] No token provided');
        return null;
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    
    if (!cleanToken) {
        console.log('[AUTH] Empty token after cleanup');
        return null;
    }

    try {
        // Laravel personal access tokens are provided as "id|token".
        // The DB stores the SHA-256 of the token *part only* (after the pipe).
        // Extract the token part if present and hash that.
        // Decode URI-encoded tokens (socket query params may encode '|')
        const decodedToken = decodeURIComponent(cleanToken);
        const parts = decodedToken.split('|');
        const tokenPart = parts.length > 1 ? parts[1] : decodedToken;

        // Hash the token (Sanctum stores SHA-256 hash of the token part)
        const tokenHash = hashToken(tokenPart);

        // Query personal_access_tokens table
        // WHY JOIN with users:
        // - Single query instead of two
        // - Atomic check of token + user in one transaction
        const [rows] = await db.execute(`
            SELECT 
                pat.id as token_id,
                pat.tokenable_id as user_id,
                pat.expires_at,
                u.role,
                u.is_active,
                u.name
            FROM personal_access_tokens pat
            INNER JOIN users u ON u.id = pat.tokenable_id
            WHERE pat.token = ?
            AND pat.tokenable_type = 'App\\\\Models\\\\User'
            LIMIT 1
        `, [tokenHash]);

        if (rows.length === 0) {
            console.log('[AUTH] Token not found in database');
            return null;
        }

        const tokenRecord = rows[0];

        // Check expiration
        // WHY: Sanctum tokens can have optional expiration
        if (tokenRecord.expires_at) {
            const expiresAt = new Date(tokenRecord.expires_at);
            if (expiresAt < new Date()) {
                console.log('[AUTH] Token expired');
                return null;
            }
        }

        // Check user is active
        // WHY: Deactivated users should not have chat access
        if (tokenRecord.is_active === 0 || tokenRecord.is_active === false) {
            console.log('[AUTH] User is not active');
            return null;
        }

        // Check role is allowed
        // WHY: Only students and business owners can chat
        const allowedRoles = ['student', 'business'];
        if (!allowedRoles.includes(tokenRecord.role)) {
            console.log(`[AUTH] User role '${tokenRecord.role}' not allowed for chat`);
            return null;
        }

        // Update last_used_at (fire and forget, don't await)
        // WHY: Matches Laravel Sanctum behavior
        db.execute(
            'UPDATE personal_access_tokens SET last_used_at = NOW() WHERE id = ?',
            [tokenRecord.token_id]
        ).catch(err => console.error('[AUTH] Failed to update last_used_at:', err.message));

        console.log(`[AUTH] Token valid for user ${tokenRecord.user_id} (${tokenRecord.name})`);

        return {
            userId: tokenRecord.user_id,
            role: tokenRecord.role,
            name: tokenRecord.name,
        };

    } catch (error) {
        console.error('[AUTH] Token validation error:', error.message);
        return null;
    }
}

module.exports = {
    hashToken,
    validateToken,
};
