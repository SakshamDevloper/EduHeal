import uvicorn
import argparse
import sys
from app.seed import seed_db

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run EduHeal Backend Server")
    parser.add_argument("--seed", action="store_true", help="Reset and seed database tables")
    parser.add_argument("--port", type=int, default=8000, help="Port number for backend")
    args = parser.parse_args()

    if args.seed:
        print("Resetting database schema and inserting seed data...")
        try:
            seed_db()
        except Exception as e:
            print(f"Failed to seed database: {e}")
            sys.exit(1)

    print(f"Starting EduHeal API server on http://127.0.0.1:{args.port}...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=args.port, reload=True)
