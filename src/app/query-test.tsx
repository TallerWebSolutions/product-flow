'use client'

import { useQuery } from "@tanstack/react-query";

// Simple component to demonstrate Tanstack Query
export function QueryTest() {
  const { isPending, error, data } = useQuery({
    queryKey: ['repoData'],
    queryFn: () =>
      fetch('https://api.github.com/repos/tanstack/query')
        .then(res => res.json())
  });

  if (isPending) return <div>Loading...</div>;

  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="rounded border p-4 bg-slate-50">
      <h2 className="text-lg font-bold mb-2">Tanstack Query Test</h2>
      <p className="mb-2">⭐ Stars: {data.stargazers_count}</p>
      <p className="mb-2">🔍 Watchers: {data.subscribers_count}</p>
      <p className="mb-2">🧑‍💻 Owner: {data.owner.login}</p>
    </div>
  );
}