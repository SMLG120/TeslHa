import { ButtonLink } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="grid-bg flex min-h-[80svh] flex-col items-center justify-center px-4 text-center">
      <p className="hud-label text-volt">Error 404</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Route not found</h1>
      <p className="mt-3 max-w-md text-mist">That page isn&rsquo;t part of the TeslHa fleet.</p>
      <ButtonLink href="/" variant="primary" className="mt-8">Back to home</ButtonLink>
    </div>
  );
}
