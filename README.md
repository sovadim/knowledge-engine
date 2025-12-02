# Knowledge Engine

## Dependencies

* [uv](https://docs.astral.sh/uv/#installation) (alternative python package manager)

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
