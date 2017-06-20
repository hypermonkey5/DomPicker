#!/bin/bash

path="./files"
files=(`ls $path`)
num=${#files[*]}
num=`expr $num - 1`
tf="train.txt"
rm $tf
touch $tf
for i in $(seq 0 $num)
do
	cat $path"/"${files[$i]} >> $tf
done