# -*- coding: utf-8 -*-

train_x = []
train_y = []
for line in open('train.txt', 'r'):
	tmp = line.split(',')
	train_x.append([tmp[0],tmp[1],tmp[2],tmp[3],tmp[4],tmp[5],tmp[6],tmp[7],tmp[8],tmp[9]])
	train_y.append(tmp[10].split('\n')[0])

import numpy as np
from sklearn import datasets

from sklearn.svm import SVC
clf = SVC()
clf.fit(train_x, train_y)
# result = clf.predict(x_test)

from sklearn.externals import joblib
joblib.dump(clf, 'web.pkl')