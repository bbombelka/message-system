const threadDatabase = [
  {
    ref: 'yruTf4nvW7ZZEUjpZm5UlFuPC9BeGzyoQqvNr43OpqUr',
    title: 'Zlecenie przelewu',
    cd: 'T',
    date: '2019-10-21 13:43:34',
    nummess: 5,
    unreadmess: 5,
    type: 'C',
    read: 'N',
  },
  {
    ref: 'uDEZlQZcxQA8o7NsD6Hbz6azDCrO2pLyVVL2BrLX7kBF',
    title: 'Zlecenie przelewu',
    cd: 'T',
    date: '2019-10-20 13:43:34',
    nummess: 1,
    unreadmess: 1,
    type: 'S',
    read: 'N',
  },
  {
    ref: 'hfy5KMEehtvrLLSFg7JKq3InTqyhi473NSwNODAUD9XK',
    title: 'Zlecenie przelewu',
    cd: 'T',
    date: '2019-10-19 13:43:34',
    nummess: 1,
    unreadmess: 1,
    type: 'S',
    read: 'N',
  },
  {
    ref: '1DZRdWDAGr1gWnaYLfW7BtCudfxQFWw9lZwQXb0rgHEL',
    title: 'Zlecenie przelewu',
    cd: 'T',
    date: '2019-10-18 13:43:34',
    nummess: 15,
    unreadmess: 12,
    type: 'G',
    read: 'N',
  },
  {
    ref: 'l3UZqGndjSyjqzUfbz1U4dIcmwfwJkgCO23pxhDYublx',
    title: 'Zlecenie przelewu',
    cd: 'N',
    date: '2019-10-17 13:43:34',
    nummess: 3,
    unreadmess: 1,
    type: 'C',
    read: 'N',
  },
  {
    ref: 'BcwBhXYM08FKuL064potbfD1uJKzLhXTxx5SJ6gm8t1F',
    title: 'Zlecenie przelewu',
    cd: 'N',
    date: '2019-10-17 13:43:34',
    nummess: 5,
    unreadmess: 2,
    type: 'G',
    read: 'N',
  },
  {
    ref: '8EbJqpKd2h592OUVotWJdAdDa3FpRDVX6OS4LRImBo6T',
    title: 'Zlecenie przelewu',
    cd: 'N',
    date: '2019-10-17 13:43:34',
    nummess: 12,
    unreadmess: 2,
    type: 'C',
    read: 'N',
  },
  {
    ref: 'kiHf06sQHceE51aD6qTtebRSchCoLM1StAAzXln9qxM7',
    title: 'Zlecenie przelewu',
    cd: 'N',
    date: '2019-10-17 13:43:34',
    nummess: 1,
    unreadmess: 1,
    type: 'S',
    read: 'N',
  },
  {
    ref: 'o6ltSSokn8q8Otv03gvZbfeqV8gmqnHcdVZp3mwRMcMc',
    title: 'Zlecenie przelewu',
    cd: 'N',
    date: '2019-10-17 13:43:34',
    nummess: 1,
    unreadmess: 1,
    type: 'S',
    read: 'N',
  },
  {
    ref: 'BbpBxSLkA8OhYuDQOJQqlgo4HxU5KSljSP7PG8kgLm16',
    title: 'Zlecenie przelewu',
    cd: 'N',
    date: '2019-10-17 13:43:34',
    nummess: 1,
    unreadmess: 0,
    type: 'S',
    read: 'N',
  },
];

module.exports = threadDatabase;

function hashRef(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
