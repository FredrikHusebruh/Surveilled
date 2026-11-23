"""A small thread-safe, size-bounded in-memory store. A restart forgets everything in it."""

from collections import OrderedDict
from collections.abc import Callable, Hashable
from threading import Lock


class LruStore[K: Hashable, V]:
    """Values by key, evicting the least recently used past `capacity`.

    A key never stored reads as `fresh(key)`. `update` runs a transition under the store's lock,
    so two requests on the same key can't interleave. The lock is global, so keep slow work out of
    transitions.
    """

    def __init__(self, capacity: int, fresh: Callable[[K], V]) -> None:
        self._capacity = capacity
        self._fresh = fresh
        self._values: OrderedDict[K, V] = OrderedDict()
        self._lock = Lock()

    def get(self, key: K) -> V:
        with self._lock:
            return self._touch(key)

    def update[T](self, key: K, transition: Callable[[V], tuple[V, T]]) -> tuple[V, T]:
        """Apply `transition` atomically and store its new value. If it raises, nothing changes."""
        with self._lock:
            updated, result = transition(self._touch(key))
            self._values[key] = updated
            self._values.move_to_end(key)
            while len(self._values) > self._capacity:
                self._values.popitem(last=False)
            return updated, result

    def _touch(self, key: K) -> V:
        if key not in self._values:
            return self._fresh(key)
        self._values.move_to_end(key)
        return self._values[key]
