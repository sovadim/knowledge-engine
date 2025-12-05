# Knowledge Engine

## Dependencies

* [uv](https://docs.astral.sh/uv/#installation) (alternative python package manager)

## Project structure

```
knowledge-engine
|__backend  - FastAPI backend
|__demo     - Demo data and script
|__frontend - ReactJS frontend
```

## How to Run Demo

Using `make`:
```bash
$ make demo # will start backend and demo script
$ make down # will stop backend
```

## Backend

__In backend directory__

**How to setup:**
```bash
$ uv sync
```

**How to run:**
```bash
$ uv run uvicorn main:app
```

**Or with a make command:**
```bash
$ make up    # run backend
$ make down  # stop backend
```
