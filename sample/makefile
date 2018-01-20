.PHONY: all

all: Editor.js Editor.css Sample.html

Editor.js: ../src/Editor.jsx
	tail -n +2 ../src/Editor.jsx | babel --plugins transform-react-jsx | uglifyjs -cm > Editor.js

Editor.css: ../src/Editor.less
	cat ../src/Editor.less | lessc - -x > Editor.css

Sample.html: Sample.html.in ../src/Editor.jsx build-html.py
	tail -n +2 ../src/Editor.jsx | base64 -w 0 > Editor.jsx.bin
	cat Editor.js | gzip > Editor.js.gz
	python build-html.py > Sample.html
	rm Editor.jsx.bin Editor.js.gz

#	SOURCE=`tail -n +2 ../src/Editor.jsx | base64 -w 0` python -c "import os, sys;lines=sys.stdin.read();print lines.replace('SOURCE',os.environ['SOURCE']);" < Sample.html.in > Sample.html

.PHONY: clean

clean:
	rm -rf Editor.js Editor.css Sample.html
