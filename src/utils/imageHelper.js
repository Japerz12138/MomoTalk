/**
 * Helper function to get full image URL
 * If the URL is already absolute (starts with http), return as is
 * If it's relative and REACT_APP_SERVER_DOMAIN is set, prepend the server domain
 * Otherwise, return the relative URL as is (for same-origin deployments)
 */
export const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
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
};

