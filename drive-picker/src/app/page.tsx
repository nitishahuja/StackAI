export default function HomePage() {
  return (
    <main className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">
          Welcome to StackAI Drive Picker
        </h1>
        <button className="bg-black text-white px-4 py-2 rounded">
          Login with Google
        </button>
      </div>
    </main>
  );
}
