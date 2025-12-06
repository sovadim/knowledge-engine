# Knowledge Engine

## Dependencies

* [uv](https://docs.astral.sh/uv/#installation) (alternative python package manager)

## Project structure

```
knowledge-engine
|__frontend - ReactJS frontend
|__backend  - FastAPI backend
|__demo     - Demo data and script
```

## How to Run

### Demo

```bash
$ make demo # start backend, frontend, and demo script
$ make stop # stop backend and frontend
```

### Backend Only

```bash
$ make backend # setup backend project and run it
$ make stop    # stop backend
```

### Frontend Only

```bash
$ make frontend # setup frontend project and run it
$ make stop     # stop frontend
```

## Navigation

* Frontend runs on: http://localhost:5173
* Backend runs on http://localhost:8000

App consists of 2 main pages:

* AI chat: http://localhost:5173/chat
* Graph view: http://localhost:5173/graph

Useful backend endpoints:

* API documentation: http://localhost:8000/docs
