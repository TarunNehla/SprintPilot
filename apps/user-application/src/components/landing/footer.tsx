
export function Footer() {
  return (
    <footer className="border-t bg-background py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col items-center">
        <p className="text-sm text-muted-foreground text-center">
          &copy; {new Date().getFullYear()} Project Manager. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
