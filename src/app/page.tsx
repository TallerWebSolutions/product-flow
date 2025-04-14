import { Button } from "@/components/ui/button";
import { QueryTest } from "./query-test";
import { SupabaseTest } from "./supabase-test";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-3xl font-bold mb-8">Component Testing</h1>

        <div className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Tailwind CSS is working!
        </div>

        <Button variant="outline">Shadcn Button is working!</Button>

        <div className="w-full">
          <QueryTest />
        </div>

        <div className="w-full mt-4">
          <SupabaseTest />
        </div>
      </div>
    </main>
  );
}
