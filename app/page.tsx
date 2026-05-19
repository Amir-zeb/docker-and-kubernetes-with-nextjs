"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [instance, setInstance] = useState("");

  useEffect(() => {
    fetch("/api/instance")
      .then((res) => res.json())
      .then((data) => {
        setInstance(data.instance);
      });
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Environment. {process.env.NODE_ENV}
          </h1>
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Served by: {instance}
          </h1>
        </div>
      </main>
    </div>
  );
}
