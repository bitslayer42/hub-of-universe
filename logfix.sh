# Usage: ./logfix.sh
sed 's/.*\[browser\] \[log\] //;
s/(http\:\/\/localhost\:5173.*//' < log.log > out.log