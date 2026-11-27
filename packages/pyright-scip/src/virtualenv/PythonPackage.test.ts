import assert from 'assert';
import PythonPackage from './PythonPackage';

// Real `pip show -f` output for two packages, taken from issue #173. pytest-django
// puts its full license into the `License:` metadata field, so the block contains
// dashed rule lines (`----...`). Those start with `\n---`, which is what the old
// split matched, shattering pytest-django across several blocks and making
// PythonPackage.fromPipShow throw "Unexpected. Thought I should be getting files now".
const pipShowOutput = `Name: pytest-django
Version: 4.11.1
Summary: A Django plugin for pytest.
Home-page:
Author:
Author-email: Andreas Pelme <andreas@pelme.se>
License: pytest-django is released under the BSD (3-clause) license
----------------------------------------------------------
Copyright (c) 2015-2018, pytest-django authors (see AUTHORS file)
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES ARE DISCLAIMED.


This version of pytest-django is a fork of pytest_django created by Ben Firshman.
---------------------------------------------------------------------------------
Copyright (c) 2009, Ben Firshman
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met.

Location: /home/leni/.cache/pypoetry/virtualenvs/test-infra-back-lSRTar0T-py3.12/lib/python3.12/site-packages
Requires: pytest
Required-by:
Files:
  pytest_django-4.11.1.dist-info/INSTALLER
  pytest_django-4.11.1.dist-info/METADATA
  pytest_django-4.11.1.dist-info/RECORD
  pytest_django/__init__.py
  pytest_django/fixtures.py
  pytest_django/plugin.py
  pytest_django/py.typed
---
Name: attrs
Version: 25.3.0
Summary: Classes Without Boilerplate
Location: /home/leni/.cache/pypoetry/virtualenvs/test-infra-back-lSRTar0T-py3.12/lib/python3.12/site-packages
Requires:
Required-by: pytest-django
Files:
  attr/__init__.py
  attrs/__init__.py
`;

test('splitPipShowBlocks keeps a package whose License contains dashed rules in one block', () => {
    const blocks = PythonPackage.splitPipShowBlocks(pipShowOutput);
    assert.strictEqual(blocks.length, 2);

    const packages = blocks.map((block) => PythonPackage.fromPipShow(block));
    assert.deepStrictEqual(
        packages.map((pkg) => pkg.name),
        ['pytest-django', 'attrs']
    );

    assert.strictEqual(packages[0].version, '4.11.1');
    assert.ok(packages[0].files.includes('pytest_django/__init__.py'));
    assert.ok(packages[0].files.includes('pytest_django/plugin.py'));
    assert.ok(!packages[0].files.some((file) => file.includes('.dist-info')));

    assert.strictEqual(packages[1].version, '25.3.0');
    assert.deepStrictEqual(packages[1].files, ['attr/__init__.py', 'attrs/__init__.py']);
});
