import { Button } from "@school-wise/styleguide";

const App = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-red-900">
            School Management Portal
          </h1>
        </div>

        <div className="p-4">
          <Button>Sign In</Button>
        </div>
      </div>
    </div>
  );
};

export default App;
