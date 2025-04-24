plot y = (exp(x * log(1.0 + z)) - 1.0) / z, x=0..1,z=0..40 

plot y = (exp(x * log(1.0 + 12)) - 1.0) / 12, x=0..1 


inverse: 
plot x = log(12 y + 1)/log(12 + 1), y=0..1
plot x = log(z y + 1)/log(z + 1), y=0..1,z=0..40 

* sin(acos(rho)) ???



// Idonno try this?
plot y = arsinh(tan(x)),x=-pi/2..pi/2

inverse:
plot x = arctan(sinh(y)),y=-pi..pi
or: arctan((e^x - e^(-x)) / 2)

arctan(sinh(π)) => 1.48442223 rads (85.05 deg)



(e^x - e^(-x)) / 2. === sinh(x)


npm