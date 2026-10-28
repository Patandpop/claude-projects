g=open('../oracle5/glassx.js',encoding='utf8').read()
assert 'return { cut, render, RM };' in g and '</script' not in g
g=g.replace('return { cut, render, RM };','return { cut, render, RM, cutTile };')
t=open('r6.tpl.html',encoding='utf8').read().replace('/*GLASSX*/',g)
open('tabs4.html','w',encoding='utf8').write(t)
