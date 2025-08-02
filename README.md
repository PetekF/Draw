# Draw

A simple JavaScript application for freehand drawing. 

## Functionalities

Contains only basic functionalities such as:
- drawing -> _left mouse button_
- moving -> _right mouse button_
- zoom in/out -> _mouse wheel_
- undo/redo -> _ctrl+z/ctrl+y_

In addition to drawing there is an option to clear canvas and to overlay canvas with either rectangular or hexagonal grid.

The following action are undoable/redoable: drawing and clearing the canvas. History of other actions isn't tracked so they do not fall under undo/redo functionality

## Setup

Since this app uses Javascript modules a http server is necessary in order for application to work. This project uses Python FastAPI to serve files but configuring any http server to serve files from _app/_ directory should do the trick.
