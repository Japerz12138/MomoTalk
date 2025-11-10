/**
 * Helper function to get full image URL
 * If the URL is already absolute (starts with http), return as is
 * If it's relative, prepend the server domain
 */
export const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // Check if it's already a full URL
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }
    
    // It's a relative URL, prepend server domain
    const serverDomain = process.env.REACT_APP_SERVER_DOMAIN || 'http://localhost:5000';
    
    // Remove leading slash if exists to avoid double slashes
    const cleanUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    
    return `${serverDomain}${cleanUrl}`;
};

