/**
 * Helper function to get full image URL WITH authentication token (Yeah, no more outside access!)
 * If the URL is already absolute (starts with http), return as is
 * If it's relative and REACT_APP_SERVER_DOMAIN is set, prepend the server domain
 * Otherwise, return the relative URL as is (for same-origin deployments)
 * Adds token as query parameter for authenticated image access
 */
export const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // Default avatar doesn't need token
    if (imageUrl === 'avatar.jpg' || !imageUrl.startsWith('/uploads')) {
        // Check if it's already a full URL
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }
        
        // If no server domain is configured, use relative URL (same-origin)
        const serverDomain = process.env.REACT_APP_SERVER_DOMAIN;
        if (!serverDomain || serverDomain === '') {
            // Ensure it starts with /
            return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
        }
        
        // It's a relative URL and we have a server domain, prepend it
        const cleanUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
        return `${serverDomain}${cleanUrl}`;
    }
    
    // Add token to the image URL
    const token = localStorage.getItem('token');
    const serverDomain = process.env.REACT_APP_SERVER_DOMAIN;
    const baseUrl = serverDomain || '';
    const cleanUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    const fullUrl = `${baseUrl}${cleanUrl}`;
    
    // token query parameter
    return token ? `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : fullUrl;
};

