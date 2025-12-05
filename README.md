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
