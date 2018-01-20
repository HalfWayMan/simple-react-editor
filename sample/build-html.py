import os, commands
with open("Sample.html.in") as html_file:
  sample = html_file.read()
  with open("Editor.jsx.bin") as source_file:
    source = source_file.read()
    cloc = commands.getoutput('cloc --quiet --csv --force-lang="JavaScript",jsx ../src/Editor.jsx').split('\n')[2].split(',')[4]
    minified_size = os.path.getsize('Editor.js')
    gzip_size = os.path.getsize('Editor.js.gz')
    print sample.replace('SOURCE', source).replace('MINIFIED_SIZE', "{:.0f}".format(minified_size/1024.0)).replace('GZIP_SIZE', "{:.0f}".format(gzip_size/1024.0)).replace ('CLOC', "{:.1f}".format(float(cloc)/1024.0))
