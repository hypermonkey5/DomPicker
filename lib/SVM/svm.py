#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import numpy as np
from sklearn import datasets
from sklearn.externals import joblib

argvs = sys.argv
model = joblib.load(argvs[1])
data = np.array(argvs[2].split(','),dtype=np.float).tolist()
dim = int(argvs[3])
data = [data[x:x+dim] for x in range(0,len(data),dim)]
result = model.predict(data)
result = map(str,result)
sys.stdout.write(','.join(result))