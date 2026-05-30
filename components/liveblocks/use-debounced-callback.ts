"use client";

import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<T extends unknown[]>(
	callback: (...args: T) => void | Promise<void>,
	delayMs: number,
) {
	const timeoutRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (timeoutRef.current !== null) {
				window.clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return useCallback(
		(...args: T) => {
			if (timeoutRef.current !== null) {
				window.clearTimeout(timeoutRef.current);
			}

			timeoutRef.current = window.setTimeout(() => {
				void callback(...args);
			}, delayMs);
		},
		[callback, delayMs],
	);
}
