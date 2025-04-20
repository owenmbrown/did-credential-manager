  -- a fresh start, comment out if you do not want to remove old tables
 drop tables if exists user, account, transaction;
 
 -- creating user table

create table user (
	licenseNumber varchar(20) unique,
    userFirstName varchar(20) not null,
    userLastName varchar(20) not null,
    userAddress varchar(75)
);

 -- creating account table
 
 create table account (
	accountID int auto_increment primary key,
    licenseNumber varchar(20),
    accountLabel varchar(15) not null,
    accountBalance int
);

 -- creating transaction table

create table transaction (
	transactionID int auto_increment primary key,
    accountID int,
    transactionAmount int not null,
    startBalance int,
    endBalance int
);

-- population begins here

-- Insert users
INSERT INTO user (licenseNumber, userFirstName, userLastName, userAddress) VALUES
('DL1234', 'Emma', 'Watson', '100 Elm Street'),
('DL4444', 'Liam', 'Johnson', '202 Birch Lane'),
('DL3333', 'Olivia', 'Brown', '303 Cedar Avenue'),
('DL8989', 'Noah', 'Williams', '404 Spruce Drive'),
('DL3434', 'Ava', 'Miller', '505 Willow Blvd');

-- Insert accounts
INSERT INTO account (licenseNumber, accountLabel, accountBalance) VALUES
('DL1234', 'Checking', 3200),
('DL1234', 'Savings', 15000),
('DL4444', 'Checking', 450),
('DL3333', 'Investment', 22000),
('DL3333', 'Savings', 5000),
('DL8989', 'Checking', 600),
('DL3434', 'Savings', 8000);


-- Insert transactions
-- Emma's Checking (moderate activity)
INSERT INTO transaction (accountID, transactionAmount, startBalance, endBalance) VALUES
(1, -100, 3300, 3200),
(1, -50, 3350, 3300),
(1, 500, 2800, 3300);

-- Emma's Savings (no activity)

-- Liam's Checking (busy account)
INSERT INTO transaction (accountID, transactionAmount, startBalance, endBalance) VALUES
(3, -20, 470, 450),
(3, 100, 370, 470),
(3, -50, 420, 370),
(3, -10, 380, 370),
(3, -40, 420, 380),
(3, -30, 450, 420);

-- Olivia's Investment (lots of activity)
INSERT INTO transaction (accountID, transactionAmount, startBalance, endBalance) VALUES
(4, 2000, 20000, 22000),
(4, -500, 22500, 22000),
(4, 1500, 20500, 22000),
(4, -2000, 24000, 22000),
(4, 3000, 19000, 22000),
(4, -1000, 23000, 22000),
(4, 500, 21500, 22000),
(4, -700, 22700, 22000),
(4, 1200, 20800, 22000),
(4, -300, 22300, 22000),
(4, 100, 21900, 22000),
(4, -50, 22050, 22000),
(4, 250, 21750, 22000),
(4, 100, 21900, 22000);

-- Olivia's Savings (quiet account)
INSERT INTO transaction (accountID, transactionAmount, startBalance, endBalance) VALUES
(5, 500, 4500, 5000);

-- Noah's Checking (no activity)

-- Ava's Savings (few transactions)
INSERT INTO transaction (accountID, transactionAmount, startBalance, endBalance) VALUES
(7, 2000, 6000, 8000),
(7, -500, 8500, 8000);

select * from account;
