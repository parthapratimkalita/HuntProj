from functools import wraps
from typing import Any, Dict, Optional, Callable
import time
import hashlib
import json
from datetime import datetime, timedelta

class InMemoryCache:
    def __init__(self, default_ttl: int = 300):  # 5 minutes default
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl
    
    def _generate_key(self, func_name: str, args: tuple, kwargs: dict) -> str:
        """Generate a cache key from function name and arguments"""
        # Convert args and kwargs to a string representation
        key_data = {
            'func': func_name,
            'args': args,
            'kwargs': sorted(kwargs.items())
        }
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key in self._cache:
            entry = self._cache[key]
            if time.time() < entry['expires_at']:
                return entry['value']
            else:
                # Remove expired entry
                del self._cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with TTL"""
        if ttl is None:
            ttl = self.default_ttl
        
        self._cache[key] = {
            'value': value,
            'expires_at': time.time() + ttl,
            'created_at': time.time()
        }
    
    def delete(self, key: str) -> None:
        """Delete key from cache"""
        if key in self._cache:
            del self._cache[key]
    
    def clear(self) -> None:
        """Clear all cache entries"""
        self._cache.clear()
    
    def cleanup_expired(self) -> None:
        """Remove expired entries from cache"""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self._cache.items()
            if current_time >= entry['expires_at']
        ]
        for key in expired_keys:
            del self._cache[key]

# Global cache instance
query_cache = InMemoryCache(default_ttl=300)  # 5 minutes

def cached_query(ttl: int = 300, cache_key_prefix: str = ""):
    """Decorator for caching database query results"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            func_name = f"{cache_key_prefix}_{func.__name__}" if cache_key_prefix else func.__name__
            cache_key = query_cache._generate_key(func_name, args, kwargs)
            
            # Try to get from cache
            cached_result = query_cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            query_cache.set(cache_key, result, ttl)
            return result
        
        return wrapper
    return decorator

def invalidate_cache_pattern(pattern: str) -> None:
    """Invalidate cache entries matching a pattern"""
    keys_to_delete = []
    for key in query_cache._cache.keys():
        if pattern in key:
            keys_to_delete.append(key)
    
    for key in keys_to_delete:
        query_cache.delete(key)

# Cache invalidation helpers
def invalidate_property_cache(property_id: Optional[int] = None) -> None:
    """Invalidate property-related cache entries"""
    if property_id:
        invalidate_cache_pattern(f"property_{property_id}")
    invalidate_cache_pattern("properties_list")
    invalidate_cache_pattern("get_approved_properties")

def invalidate_wishlist_cache(user_id: Optional[int] = None) -> None:
    """Invalidate wishlist-related cache entries"""
    if user_id:
        invalidate_cache_pattern(f"wishlist_{user_id}")
    invalidate_cache_pattern("wishlists")

def invalidate_user_cache(user_id: Optional[int] = None) -> None:
    """Invalidate user-related cache entries"""
    if user_id:
        invalidate_cache_pattern(f"user_{user_id}")
    invalidate_cache_pattern("users")